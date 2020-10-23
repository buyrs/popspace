import * as React from 'react';
import { ListItemIcon, ListItemText, MenuItem } from '@material-ui/core';
import { useAddAccessory } from './useAddAccessory';
import { AccessoryIcon } from '../../../../withComponents/icons/AccessoryIcon';
import { WidgetType, WidgetData } from '../../../../types/room';
import useParticipantDisplayIdentity from '../../../../withHooks/useParticipantDisplayIdentity/useParticipantDisplayIdentity';
import { useTranslation } from 'react-i18next';

const nameKeys: Record<WidgetType, string> = {
  [WidgetType.Link]: 'widgets.link.name',
  [WidgetType.StickyNote]: 'widgets.stickyNote.name',
  [WidgetType.Whiteboard]: 'widgets.whiteboard.name',
  [WidgetType.YouTube]: 'widgets.youtube.name',
};

const accessoryEmptyData: Record<WidgetType, (...args: any[]) => WidgetData> = {
  [WidgetType.Link]: () => ({
    title: '',
    url: '',
  }),
  [WidgetType.StickyNote]: (authorName: string) => ({
    text: '',
    author: authorName,
  }),
  [WidgetType.Whiteboard]: () => ({
    whiteboardState: {
      lines: [],
    },
  }),
  [WidgetType.YouTube]: () => ({
    videoId: '',
    playStartedTimestampUTC: null,
  }),
};

export interface IAddAccessoryMenuItemProps {
  accessoryType: WidgetType;
  onClick?: () => void;
}

export const AddAccessoryMenuItem = React.forwardRef<HTMLLIElement, IAddAccessoryMenuItemProps>(
  ({ accessoryType, onClick }, ref) => {
    const { t } = useTranslation();

    // TODO: remove when we solve the username disappearing problem using
    // room state and membership persistence
    const userName = useParticipantDisplayIdentity();

    const addWidget = useAddAccessory();
    const handleClick = React.useCallback(() => {
      onClick?.();
      // wrapped in a timeout so that all sync effects of the click are processed and done before
      // the widget is added - this gives time for the menu to close, for example, and move the window
      // focus element back to the button, before the widget is mounted and steals focus (for example,
      // most widget create forms have an autoFocus input)
      setTimeout(() => {
        // whiteboards publish immediately, they have no draft state.
        addWidget({
          type: accessoryType,
          initialData: accessoryEmptyData[accessoryType](userName),
          publishImmediately: accessoryType === WidgetType.Whiteboard,
          screenCoordinate: {
            x: 300,
            y: 300,
          },
        });
      });
    }, [accessoryType, addWidget, onClick, userName]);

    return (
      <MenuItem onClick={handleClick} ref={ref}>
        <ListItemIcon>
          <AccessoryIcon fontSize="default" type={accessoryType} />
        </ListItemIcon>
        <ListItemText>{t(nameKeys[accessoryType] || 'widgets.unknown.name')}</ListItemText>{' '}
      </MenuItem>
    );
  }
);
