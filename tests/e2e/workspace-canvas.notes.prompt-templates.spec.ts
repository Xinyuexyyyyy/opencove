import { expect, test, type Locator } from '@playwright/test'
import { clearAndSeedWorkspace, launchApp, seededWorkspaceId } from './workspace-canvas.helpers'

async function expectMenuAnchoredToTrigger(trigger: Locator, menu: Locator): Promise<void> {
  const triggerBox = await trigger.boundingBox()
  const menuBox = await menu.boundingBox()

  expect(triggerBox).not.toBeNull()
  expect(menuBox).not.toBeNull()

  if (!triggerBox || !menuBox) {
    return
  }

  const triggerRight = triggerBox.x + triggerBox.width
  const triggerBottom = triggerBox.y + triggerBox.height
  const menuRight = menuBox.x + menuBox.width
  const menuBottom = menuBox.y + menuBox.height

  const horizontalAnchorMatches =
    Math.abs(menuBox.x - triggerRight) <= 16 || Math.abs(menuRight - triggerRight) <= 16
  const verticalAnchorMatches =
    Math.abs(menuBox.y - triggerBottom) <= 16 || Math.abs(menuBottom - triggerBottom) <= 16

  expect(horizontalAnchorMatches).toBe(true)
  expect(verticalAnchorMatches).toBe(true)
}

test.describe('Workspace Canvas - Notes (Prompt Templates)', () => {
  test('allows notes to reuse prompt templates and persists the inserted content', async () => {
    const { electronApp, window } = await launchApp()

    try {
      await clearAndSeedWorkspace(window, [])

      const pane = window.locator('.workspace-canvas .react-flow__pane')
      await expect(pane).toBeVisible()

      await pane.click({
        button: 'right',
        position: { x: 320, y: 220 },
      })

      await window.locator('[data-testid="workspace-context-new-note"]').click()

      const noteNode = window.locator('.note-node').first()
      await expect(noteNode).toBeVisible()

      const textarea = noteNode.locator('[data-testid="note-node-textarea"]')
      const originalText = 'Sketch API rollout'
      await textarea.fill(originalText)

      const trigger = noteNode.locator('[data-testid="note-node-open-prompt-templates"]')
      await trigger.click()
      const menu = window.locator('[data-testid="note-node-prompt-templates-menu"]')
      await expect(menu).toBeVisible()
      await expectMenuAnchoredToTrigger(trigger, menu)

      await window.locator('[data-testid="note-node-prompt-templates-add-global"]').click()
      const createWindow = window.locator(
        '[data-testid="note-node-prompt-templates-create-window"]',
      )
      await expect(createWindow).toBeVisible()

      await window.locator('[data-testid="note-node-prompt-templates-create-name"]').fill('Note A')
      await window
        .locator('[data-testid="note-node-prompt-templates-create-content"]')
        .fill('NOTE-TEMPLATE')
      await window.locator('[data-testid="note-node-prompt-templates-create-save"]').click()
      await expect(createWindow).toBeHidden()

      await trigger.click()
      await expect(menu).toBeVisible()
      await expectMenuAnchoredToTrigger(trigger, menu)
      await menu.getByRole('button', { name: 'Note A' }).click()
      await expect(textarea).toHaveValue(`NOTE-TEMPLATE\n\n${originalText}`)

      const persisted = await window.evaluate(
        async ({ workspaceId }) => {
          const raw = await window.opencoveApi.persistence.readWorkspaceStateRaw()
          if (!raw) {
            return null
          }

          const parsed = JSON.parse(raw) as {
            settings?: {
              taskPromptTemplates?: Array<{ name?: string; content?: string }>
            }
            workspaces?: Array<{
              id?: string
              nodes?: Array<{
                kind?: string
                task?: {
                  text?: string
                }
              }>
            }>
          }

          const workspace = parsed.workspaces?.find(item => item.id === workspaceId)
          return {
            globalTemplates: parsed.settings?.taskPromptTemplates ?? [],
            noteText: workspace?.nodes?.find(node => node.kind === 'note')?.task?.text ?? null,
          }
        },
        { workspaceId: seededWorkspaceId },
      )

      expect(persisted).toBeTruthy()
      expect(persisted?.globalTemplates?.some(template => template.name === 'Note A')).toBe(true)
      expect(persisted?.noteText).toBe(`NOTE-TEMPLATE\n\n${originalText}`)
    } finally {
      await electronApp.close()
    }
  })
})
