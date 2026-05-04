import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NoteNode } from '../../../src/contexts/workspace/presentation/renderer/components/NoteNode'
import { useAppStore } from '../../../src/app/renderer/shell/store/useAppStore'
import { DEFAULT_AGENT_SETTINGS } from '../../../src/contexts/settings/domain/agentSettings.defaults'

vi.mock('@app/renderer/i18n', () => {
  return {
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('@xyflow/react', () => {
  return {
    useStore: (selector: (state: unknown) => unknown) => selector({ transform: [0, 0, 1] }),
  }
})

vi.mock(
  '@contexts/task/presentation/renderer/components/promptTemplates/TaskPromptTemplatesMenu',
  () => {
    return {
      TaskPromptTemplatesMenu: ({
        isOpen,
        workspaceId,
        currentRequirement,
        onChangeRequirement,
        testIdPrefix,
      }: {
        isOpen: boolean
        workspaceId: string | null
        currentRequirement: string
        onChangeRequirement: (nextRequirement: string) => void
        testIdPrefix: string
      }) =>
        isOpen ? (
          <button
            type="button"
            className="nodrag"
            data-testid={`${testIdPrefix}-mock-apply-template`}
            data-workspace-id={workspaceId ?? 'none'}
            onClick={() => {
              onChangeRequirement(`PROJECT-TEMPLATE\n\n${currentRequirement}`)
            }}
          >
            apply template
          </button>
        ) : null,
    }
  },
)

function Harness(): React.JSX.Element {
  const [text, setText] = React.useState('Sketch API rollout')

  return (
    <NoteNode
      text={text}
      position={{ x: 0, y: 0 }}
      width={360}
      height={240}
      saveDirectoryPath="/tmp"
      onClose={() => undefined}
      onResize={() => undefined}
      onTextChange={setText}
    />
  )
}

describe('NoteNode prompt templates', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeWorkspaceId: 'workspace-1',
      agentSettings: DEFAULT_AGENT_SETTINGS,
    })
  })

  afterEach(() => {
    useAppStore.setState({
      activeWorkspaceId: null,
      agentSettings: DEFAULT_AGENT_SETTINGS,
    })
  })

  it('opens the prompt templates menu and applies returned note content', async () => {
    render(<Harness />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('note-node-open-prompt-templates'))
    })

    const applyButton = screen.getByTestId('note-node-mock-apply-template')
    expect(applyButton).toHaveAttribute('data-workspace-id', 'workspace-1')

    await act(async () => {
      fireEvent.click(applyButton)
    })

    await waitFor(() => {
      expect(screen.getByTestId('note-node-textarea')).toHaveValue(
        'PROJECT-TEMPLATE\n\nSketch API rollout',
      )
    })
  })
})
