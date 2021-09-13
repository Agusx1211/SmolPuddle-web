import React, { useContext } from 'react'
import { makeStyles } from "@material-ui/core"
import { ThemeContext } from '../context/ThemeContext'

const useStyles = makeStyles((theme) => ({
  wrapper: {
    borderRadius: '100%',
    width: '15px',
    height: '15px',
    cursor: 'pointer',
    border: `2px solid ${theme.palette.primary.contrastText}`
  },
  blackBall: {
    borderRadius: '100%',
    width: '15px',
    height: '15px',
    background: '#000'
  },
  whiteBall: {
    borderRadius: '100%',
    width: '15px',
    height: '15px',
    background: '#fff'
  }
}))

export function ToggleTheme() {
  const classes = useStyles()

  const { toggle, dark } = useContext(ThemeContext);

  return <div className={classes.wrapper} >
    <div className={dark ? classes.whiteBall : classes.blackBall} onClick={toggle} />
  </div>
}
