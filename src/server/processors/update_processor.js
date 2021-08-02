class UpdateProcessor {
  async process(hermesEvent) {
    switch(hermesEvent.kind()) {
      case "transformWidget":
        return await this.updateWidgetRoomState(hermesEvent)
      case "updateWidget":
        return await this.updateWidgetState(hermesEvent)
      case "transformSelf":
        return await this.updateRoomParticipantState(hermesEvent)
      case "updateSelf":
        return await this.updateParticipantState(hermesEvent)
      case "updateSelfDisplayName":
        return await this.updateActorDisplayName(hermesEvent)
      case "updateSelfAvatarName":
        return await this.updateActorAvatarName(hermesEvent)
      case "updateSelfActor":
        /* DEPRECATED - use updateSelfDisplayName and updateSelfAvatarName instead*/
        return await this.tempUpdateDisplayAndAvatarName(hermesEvent)
      case "updateRoomState":
        return await this.updateRoomState(hermesEvent)
      case "updateWallpaper":
        return await this.updateWallpaper(hermesEvent)
      default:
        return await hermesEvent.senderParticipant().sendError(
          hermesEvent,
          lib.ErrorCodes.EVENT_TYPE_INVALID,
          `Unrecognized event type: ${hermesEvent.kind()}`
        )
    }
  }

  async updateWidgetRoomState(event) {
    const widget = event.payload()
    const sender = event.senderParticipant()
    const result = await shared.db.room.data.updateRoomWidgetState(event.roomId(), widget.widget_id, widget.transform)
    sender.respondAndBroadcast(event, "widgetTransformed")
  }

  async updateWidgetState(event) {
    const widget = event.payload()
    const sender = event.senderParticipant()
    const result = await shared.db.room.data.updateWidgetState(widget.widget_id, widget.widget_state)
    sender.respondAndBroadcast(event, "widgetUpdated")
  }

  async updateRoomParticipantState(event) {
    const sender = event.senderParticipant()
    return sender.updateTransform(event.payload().transform, event)
  }

  async updateParticipantState(event) {
    const sender = event.senderParticipant()
    return sender.updateState(event.payload().participant_state, event)
  }

  async updateRoomState(event) {
    const sender = event.senderParticipant()
    await shared.db.room.data.updateRoomState(event.roomId(), event.payload())
    sender.respondAndBroadcast(event, "roomStateUpdated")
  }

  /* DEPRECATED - use updateSelfDisplayName and updateSelfAvatarName instead*/
  async tempUpdateDisplayAndAvatarName(event) {
    log.error.warn("Deprecated use of tempUpdateDisplayAndAvatarName")
    const payload = event.payload()
    if(payload.display_name) {
      this.updateActorDisplayName(event)
    }
    if(payload.avatar_name) {
      this.updateActorAvatarName(event)
    }
  }

  async updateActorDisplayName(event) {
    const sender = event.senderParticipant()
    return sender.updateDisplayName(event.payload().display_name, event)
  }

  async updateActorAvatarName(event) {
    const sender = event.senderParticipant()
    return sender.updateAvatarName(event.payload().avatar_name, event)
  }

  async updateWallpaper(event) {
    const sender = event.senderParticipant()
    const wallpaperId = event.payload().wallpaper_id
    const userCanAccess = await shared.db.wallpapers.canUserAccessWallpaper(sender.actorId(), wallpaperId)
    if (!userCanAccess) {
      return sender.sendError(event, lib.ErrorCodes.UNAUTHORIZED, "You do not have permission to access this wallpaper")
    }
    const updatedRooms = await shared.db.pg.massive.room_states.update({ room_id: event.roomId() }, {
      wallpaper_id: wallpaperId
    })
    if (updatedRooms.length === 0) {
      return sender.sendError(event, lib.ErrorCodes.ROOM_NOT_FOUND, "No such room", { roomId: event.roomId() })
    }
    const wallpaperData = await shared.db.pg.massive.wallpapers.findOne(wallpaperId)
    sender.sendResponse(event, { wallpaper: wallpaperData })
    sender.broadcastPeerEvent("wallpaperUpdated", { wallpaper: wallpaperData })
  }
}

module.exports = UpdateProcessor
