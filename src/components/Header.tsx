
import React, { useState } from 'react'
import Button from '@material-ui/core/Button'
import Grid from '@material-ui/core/Grid'
import Typography from '@material-ui/core/Typography'
import { makeStyles } from '@material-ui/core/styles'

import { alpha, Container, InputBase, Paper } from '@material-ui/core'
import { useHistory, useLocation, useParams } from 'react-router-dom'
import ArrowBackIcon from '@material-ui/icons/ArrowBack'
import SearchIcon from '@material-ui/icons/Search'
import { useObservable, useStore } from '../stores'
import { Web3Store } from '../stores/Web3Store'
import { shortAddress } from '../types/address'

const useStyles = makeStyles((theme) => ({
  head: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(8, 0, 6)
  },
  container: {
    maxWidth: 660
  },
  headButtons: {
    marginTop: theme.spacing(4)
  },
  title: {
    marginTop: 70,
    padding: 0
  },
  search: {
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing(1),
      width: 'auto',
    },
  },
  inputRoot: {
    color: 'inherit',
  },
  inputInput: {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: '12ch',
      '&:focus': {
        width: '30ch',
      },
    },
  },
}))

export function Header() {
  const classes = useStyles()
  const history = useHistory()
  const location = useLocation()

  const web3store = useStore(Web3Store)
  const account = useObservable(web3store.account)

  const isMain = location.pathname === '' || location.pathname === '/'

  return (
    <div className={classes.head}>
      <Container className={classes.container}>
        <Grid container spacing={2} justify="center">
          <Grid item>
            {/* <img src={Magpie} height={140}></img> */}
          </Grid>
          <Grid item>
            <Typography className={classes.title} component="h1" variant="h2" align="center" color="textPrimary" gutterBottom>
              Smol Puddle
            </Typography>
          </Grid>
        </Grid>
          <Typography variant="h5" align="center" color="textSecondary" paragraph>
            The puddle is rainwater I swear.
          </Typography>
        <div className={classes.headButtons}>
          <Grid container spacing={2} justify="center">
            <Grid item>
              { !isMain &&
                <Button onClick={() => history.push('/') } >
                  <ArrowBackIcon color="primary" />
                </Button>
              }
            </Grid>
            <Grid item>
              <Button onClick={() => history.push('/listings') } variant="contained" color="primary">
                Listings
              </Button>
            </Grid>
            <Grid item>
              <Button onClick={() => history.push('/sell') } variant="contained" color="primary">
                Create order
              </Button>
            </Grid>
            <Grid item>
             <Button onClick={() => web3store.connect() } variant="contained" color="primary">
                { account ? `Disconnect ${shortAddress(account)}` : 'Connect'}
              </Button>
            </Grid>
          </Grid>
        </div>
      </Container>
  </div>
  )
}
