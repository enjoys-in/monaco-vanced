export enum LayoutEvents {
  Split = "layout:split",
  Resize = "layout:resize",
  Focus = "layout:focus",
  StateChange = "layout:state-change",
  StateRestore = "layout:state-restore",
  StateSave = "layout:state-save",
}

export enum SidebarEvents {
  Toggle = "sidebar:toggle",
  Resize = "sidebar:resize",
  ViewActivate = "sidebar:view-activate",
  ViewRegister = "sidebar:view-register",
  ViewRefresh = "sidebar-view:refresh",
}

export enum PanelEvents {
  RightToggle = "right-panel:toggle",
  RightResize = "right-panel:resize",
  RightViewActivate = "right-view:activate",
  BottomToggle = "bottom-panel:toggle",
  BottomResize = "bottom-panel:resize",
  BottomViewActivate = "bottom-view:activate",
}

export enum StatusbarEvents {
  ItemRegister = "statusbar:item-register",
  ItemUpdate = "statusbar:item-update",
  ItemRemove = "statusbar:item-remove",
  ItemClick = "statusbar:item-click",
}
