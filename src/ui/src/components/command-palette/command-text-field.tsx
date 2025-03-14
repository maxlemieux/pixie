/*
 * Copyright 2018- The Pixie Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';

import { useAutocomplete, alpha } from '@mui/material';
import { Theme } from '@mui/material/styles';
import { createStyles, makeStyles } from '@mui/styles';
import { HotKeys } from 'react-hotkeys';

import { PixieCommandIcon } from 'app/components';
import { isMac } from 'app/utils/detect-os';

import { CommandPaletteSuffix } from './command-palette-affixes';
import { CommandPaletteContext } from './command-palette-context';
import { CommandInputToken } from './command-tokens';
import { CommandCompletion } from './providers/command-provider';

const useFieldStyles = makeStyles((theme: Theme) => createStyles({
  hotKeyWrapper: {
    height: '100%',
    width: '100%',
  },
  root: {
    height: '100%',
    position: 'relative',
    display: 'flex',
    flexFlow: 'column nowrap',
    justifyContent: 'stretch',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  topContainer: {
    flex: '0 0 auto',
    display: 'flex',
    flexFlow: 'row nowrap',
    justifyContent: 'stretch',
    alignItems: 'center',
    height: theme.spacing(5),

    backgroundColor: alpha(theme.palette.background.default, .25),
    borderBottom: theme.palette.border.unFocused,
    '&:hover, &:focus': {
      backgroundColor: alpha(theme.palette.background.default, .5),
    },

    '& > *': { flex: '0 0 auto' },
    '& > label': {
      display: 'flex', // To fix vertical alignment
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    },
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    flex: '1 1 auto',
    height: '100%',
    overflow: 'hidden',

    // The overlay colors text and may replace symbols. Don't show the plain text, but do show the caret.
    '& input': {
      ...theme.typography.body1,
      background: 'transparent',
      border: 'none',
      color: 'transparent',
      caretColor: theme.palette.text.primary,
      width: '100%',
      padding: 0,
    },
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    lineHeight: theme.spacing(4.875), // One pixel shy to match the input exactly
    width: '100%',
    pointerEvents: 'none',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    // No `text-overflow: ellipsis` here, because it doesn't look/feel right on an input.
  },
  ctaWrapper: {},
  hints: {
    flex: '0 0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: theme.palette.border.unFocused,
    ...theme.typography.caption,
    fontStyle: 'italic',
    padding: `0 ${theme.spacing(0.5)}`,
  },
  hintSpacer: {
    flexGrow: 1,
  },
  paper: {
    flex: '1 1 auto',
    display: 'flex',
    flexFlow: 'row nowrap',
    justifyContent: 'stretch',
    alignItems: 'stretch',

    '& > ul': {
      flex: '6 0 60%',
    },
  },
  optionsContainer: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    '& > li': {
      cursor: 'pointer',
      padding: theme.spacing(1),

      '&.Mui-focused': {
        backgroundColor: theme.palette.background.two,
      },
    },
  },
  paperDetails: {
    flex: '4 0 40%',
    display: 'flex',
    flexFlow: 'column nowrap',
    borderLeft: theme.palette.border.unFocused,
    padding: theme.spacing(1),
    height: '100%',
    overflowY: 'auto',
  },
  centerDetails: {
    margin: 'auto',
  },
}), { name: 'CommandTextField' });

export interface CommandTextFieldProps {
  text: string;
}

export const CommandTextField = React.memo<CommandTextFieldProps>(({
  text,
}) => {
  const classes = useFieldStyles();

  const {
    setOpen,
    inputValue,
    setInputValue,
    selection,
    setSelection,
    tokens,
    completions,
    highlightedCompletion,
    setHighlightedCompletion,
    activateCompletion,
    cta,
  } = React.useContext(CommandPaletteContext);

  const {
    getRootProps,
    getInputLabelProps,
    getInputProps,
    getListboxProps,
    getOptionProps,
    groupedOptions,
  } = useAutocomplete({
    id: 'command-palette-autocomplete',
    open: true,
    autoHighlight: true,
    options: completions,
    freeSolo: true,
    disableCloseOnSelect: true,
    getOptionLabel: (o: CommandCompletion) => o?.key ?? '',
    filterOptions: (opts) => opts, // They're already filtered, but when renderOption exists, so must this.
    onChange: (_, option: CommandCompletion) => { // Takes event, option, reason, details (in case we need them)
      activateCompletion(option);
    },
    onHighlightChange: (_, option: CommandCompletion) => {
      setHighlightedCompletion(option);
    },
    inputValue: inputValue,
    onInputChange: (e) => {
      const t = e?.target as HTMLInputElement;
      if (typeof t?.value === 'string') {
        setInputValue(t.value);
        setSelection([t.selectionStart, t.selectionEnd]);
      }
    },
  });

  React.useEffect(() => setInputValue(text), [text, setInputValue]);

  const [inputEl, setInputEl] = React.useState<HTMLInputElement>(null);
  const setInputRef = React.useCallback((el: HTMLInputElement) => {
    setInputEl(el);
    // Need both references to be set so that useAutocomplete above knows where to attach stuff
    (getInputProps() as { ref: React.MutableRefObject<HTMLInputElement> }).ref.current = el;
  }, [getInputProps]);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const onInputScroll = React.useCallback(() => {
    setTimeout(() => {
      if (overlayRef.current && inputEl) {
        overlayRef.current.scrollLeft = inputEl.scrollLeft;
      }
    });
  }, [inputEl]);

  // On open, we want to focus the input. Need to wait a moment for the text to propagate.
  React.useEffect(() => {
    setTimeout(() => {
      inputEl?.focus();
      const l = inputEl?.value.length ?? 0;
      inputEl?.setSelectionRange(l, l);
      onInputScroll();
    });
  }, [inputEl, onInputScroll]);

  // If a completion moves the selection, wait for the value to update and then move the real caret.
  React.useEffect(() => {
    if (!inputEl || inputEl.value !== inputValue) return;
    if (selection[0] !== inputEl.selectionStart || selection[1] !== inputEl.selectionEnd) {
      inputEl.setSelectionRange(selection[0], selection[1]);
      onInputScroll();
    }
  }, [inputEl, inputValue, selection, onInputScroll]);

  // If the user moves the caret themselves, update the internal representation.
  const onTextSelect = React.useCallback((event: React.SyntheticEvent) => {
    const t = event.target as HTMLInputElement;
    setSelection((prev) => {
      if (prev[0] !== t.selectionStart || prev[1] !== t.selectionEnd) {
        onInputScroll();
        return [t.selectionStart, t.selectionEnd];
      } else return prev;
    });
  }, [setSelection, onInputScroll]);

  const onMaybeEscapePress: React.KeyboardEventHandler = React.useCallback((event) => {
    if (event.key === 'Escape' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      setOpen(false);
    }
  }, [setOpen]);

  const hotKeyMap = React.useMemo(() => {
    const seqPrefix = isMac() ? 'Meta' : 'Control';
    return {
      'command-palette-cta': `${seqPrefix}+enter`,
    };
  }, []);

  const hotKeyHandlers = React.useMemo(() => ({
    'command-palette-cta': (e: KeyboardEvent) => {
      // We cancel the event even if the button is disabled, so that the shortcut doesn't do something under the dialog.
      e.preventDefault();
      e.stopPropagation();
      if (!cta?.disabled && cta?.action) cta.action();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cta, cta?.disabled, cta?.action]);

  return (
    <HotKeys keyMap={hotKeyMap} handlers={hotKeyHandlers} className={classes.hotKeyWrapper} allowChanges>
      <div className={classes.root}>
        {/* Top: the input itself and the CTA */}
        <div className={classes.topContainer} {...getRootProps()}>
          <label {...getInputLabelProps()}>
            <PixieCommandIcon />
          </label>
          <div className={classes.inputWrapper}>
            <input
              {...getInputProps()}
              ref={setInputRef}
              onSelect={onTextSelect}
              onScroll={onInputScroll}
              onKeyDown={onMaybeEscapePress}
            />
            <div className={classes.overlay} ref={overlayRef} aria-hidden>
              {tokens.map((token, i) => (
                <CommandInputToken key={i} token={token} />
              ))}
            </div>
          </div>
          <div className={classes.ctaWrapper}>
            <CommandPaletteSuffix />
          </div>
        </div>
        {/* Hints: keyboard shortcuts, error state, relevant one-line extras that don't go in the suggestions */}
        <div className={classes.hints}>
          <div className={classes.hintSpacer}>&nbsp;</div>
          <code>{isMac() ? 'cmd+enter' : 'ctrl+enter'}</code>
        </div>
        {/* Main area: the suggestions themselves on the left; descriptions on the right */}
        <div className={classes.paper}>
          <ul {...getListboxProps()} className={classes.optionsContainer}>
            {groupedOptions.map((option, index) => (
              <li key={index} {...getOptionProps({ option, index })}>{option.label}</li>
            ))}
          </ul>
          <div className={classes.paperDetails}>
            {(completions.length && highlightedCompletion?.description) || (
              <div className={classes.centerDetails}>
                {completions.length ? 'Select an option on the left.' : 'No results.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </HotKeys>
  );
});
CommandTextField.displayName = 'CommandTextField';
