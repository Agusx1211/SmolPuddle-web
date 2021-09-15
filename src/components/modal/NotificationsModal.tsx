import { Button, Snackbar, Typography } from "@material-ui/core"
import { useEffect, useState } from "react"
import { useStore } from "../../stores"
import { useObservable } from 'micro-observables'
import { NotificationsStore } from "../../stores/NotificationsStore"
import MuiAlert from '@material-ui/lab/Alert'

export function NotificationsModal() {
  const notificationsStore = useStore(NotificationsStore)
  const notifications = useObservable(notificationsStore.notifications)

  const [closed, setClosed] = useState(false)

  const open = notifications.length > 0
  const pick = notifications[0]

  useEffect(() => setClosed(false), [pick])

  const handleClose = () => {
    if (pick?.onClose) pick.onClose()
    setClosed(true)
    setTimeout(() => notificationsStore.shift(), 1000)
  }

  const action = pick?.action ? (
    <Button color="secondary" size="small" onClick={pick?.action.onClick}>
      {pick?.action.text}
    </Button>
  ) : undefined

  return <Snackbar open={open && !closed} autoHideDuration={6000} action={action} onClose={handleClose}>
    <MuiAlert elevation={3} variant="filled" onClose={handleClose} severity={pick?.severity}>
      <Typography style={{ fontWeight: 'bold' }}>{ pick?.content }</Typography>
    </MuiAlert>
  </Snackbar>
}
