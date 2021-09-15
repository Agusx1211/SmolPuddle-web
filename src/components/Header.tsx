import { useEffect, useMemo } from 'react'
import Button from '@material-ui/core/Button'
import Grid from '@material-ui/core/Grid'
import Typography from '@material-ui/core/Typography'
import { makeStyles } from '@material-ui/core/styles'

import { alpha, Collapse, Container, IconButton, InputBase, MenuItem, Paper, Select } from '@material-ui/core'
import { useHistory, useLocation, useParams } from 'react-router-dom'
import ArrowBackIcon from '@material-ui/icons/ArrowBack'
import { useObservable, useStore } from '../stores'
import { Web3Store } from '../stores/Web3Store'
import { shortAddress } from '../types/address'
import Smol from '../smol.png'
import SearchIcon from '@material-ui/icons/Search'
import { SearchStore } from '../stores/SearchStore'
import { AlertsAndTermsStore } from '../stores/AlertAndTermsStore'
import { Alert } from '@material-ui/lab'
import CloseIcon from '@material-ui/icons/Close'

const useStyles = makeStyles((theme) => ({
  head: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(8, 0, 6)
  },
  container: {
    maxWidth: 990
  },
  headButtons: {
    marginTop: theme.spacing(2)
  },
  title: {
    marginTop: 40,
    padding: 0
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
  searchIcon: {
    color: theme.palette.primary.main,
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    color: theme.palette.primary.main,
    border: "1px solid ".concat(alpha(theme.palette.primary.main, 0.5)),
    '&:hover': {
      border: "1px solid ".concat(theme.palette.primary.main),
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
      // Reset on touch devices, it doesn't add specificity
      '@media (hover: none)': {
        backgroundColor: 'transparent'
      }
    },
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing(1),
      width: 'auto',
    },
  },
  warning: {
    margin: theme.spacing(4)
  },
  sort: {
    color: theme.palette.primary.main,
    border: "1px solid ".concat(alpha(theme.palette.primary.main, 0.5)),
    '&:hover': {
      border: "1px solid ".concat(theme.palette.primary.main),
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
      // Reset on touch devices, it doesn't add specificity
      '@media (hover: none)': {
        backgroundColor: 'transparent'
      }
    },
    padding: theme.spacing(0, 2),
    height: 37,
    borderRadius: theme.shape.borderRadius,
  }
}))

export function Header() {
  const classes = useStyles()
  const location = useLocation()

  const alertsAndTermsStore = useStore(AlertsAndTermsStore)
  const web3store = useStore(Web3Store)
  const searchStore = useStore(SearchStore)

  const account = useObservable(web3store.account)
  const rightChain = useObservable(web3store.rightChain)
  const sortingFilter = useObservable(searchStore.sortingFilter)
  const { search } = useParams<{ search: string }>()
  const history = useHistory()

  const isMain = location.pathname === '' || location.pathname === '/'
  const path = history.location.pathname

  const alertClosed = useObservable(alertsAndTermsStore.closedSign.observable)

  const handleSortChange = (event: any) => {
    searchStore.setSortingFilter(event!.target.value)
  }

  useEffect(() => {
    if (!search || search === '') {
      if (path.includes('search')) {
        history.push(searchStore.prevPage.get())
      } else {
        searchStore.setPrevPage(path)
      }
    }
  }, [searchStore, history, search, path])

  const slogan = useMemo(() => {
    const all = [
      "100% made of rainwater",
      "Your little pond with NFTs on Arbitrum",
      "He's smiling at you",
      "Are ERC-1155 tokens NFTs or just FTs?",
      "Time to dip your toes in Loot",
      "If you are a NFT creator stop enabling CORS",
      "Powered by your browser and nothing more",
      "This orderbook uses Waku",
      "Very smol but it's here",
      "The open sea is cool, but the smol puddle is next to you",
      "Time limited offer: 0% fee",
      "Arbitrum Arbitrum Arbitrum"
    ]
    return all[new Date().getTime() % all.length]
  }, [])

  return (
    <div className={classes.head}>
      <Container className={classes.container}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <img src={Smol} height={100} alt=""></img>
            <Typography className={classes.title} variant="h2" align="center" color="textPrimary" gutterBottom>
              Smol Puddle
            </Typography>
            <Typography variant="h5" align="center" color="textSecondary" paragraph>
              {slogan}
            </Typography>
          </Grid>
        </Grid>
        <Collapse in={!alertClosed}>
            <Alert
              className={classes.warning}
              severity='warning'
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => {
                    alertsAndTermsStore.closedSign.set(true)
                  }}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
            >
              Smol Puddle is an alpha software, <b>it was NOT audited</b> and <b>it doesn't have any tests</b>. Loss of funds is totally possible. <b>Use at your own risk.</b>
            </Alert>
          </Collapse>
        <div className={classes.headButtons}>
          <Grid container spacing={2} justifyContent="center">
            { !isMain && <Grid item>
              <Button onClick={() => history.push('/') } >
                <ArrowBackIcon color="primary" />
              </Button>
            </Grid> }
            <Grid item>
              <Select 
                className={classes.sort}
                labelId="sorting" 
                id="select" 
                value={sortingFilter}
                onChange={handleSortChange}
              >
                <MenuItem value="low-high-price">Price: Low to High</MenuItem>
                {/* <MenuItem value="latest-sales">Recently Sold</MenuItem> */}
                {/* <MenuItem value="recent-listing">Recently Listed</MenuItem> */}
                <MenuItem value="high-low-price">Price: High to Low</MenuItem>
              </Select>
            </Grid>
            <Grid item>
              <Paper className={classes.search} elevation={0}>
                <div className={classes.searchIcon}>
                  <SearchIcon />
                </div>
                <InputBase
                  placeholder="SEARCH..."
                  classes={{
                    root: classes.inputRoot,
                    input: classes.inputInput,
                  }}
                  inputProps={{ 'aria-label': 'search' }}
                  onChange={(i) => {
                    history.push(`/search/${i.target.value}`)
                  }}
                  value={search ?? ''}
                />
              </Paper>
            </Grid>
            <Grid item>
              <Button onClick={() => history.push('/') } variant="outlined" color="primary">
                Listings
              </Button>
            </Grid>
            { account && <Grid item>
              <Button onClick={() => history.push(`/address/${account}`) } variant="outlined" color="primary">
                My NFTs
              </Button>
            </Grid> }
            <Grid item>
             <Button onClick={() => account ? rightChain ? web3store.disconnect() : web3store.requestChainChange() : web3store.connect() } variant="outlined" color={ rightChain || !account ? 'primary' : 'secondary' }>
                { account ? rightChain ? `Disconnect ${shortAddress(account)}` : 'Wrong network - Switch to Arbitrum' : 'Connect to Arbitrum'}
              </Button>
            </Grid>
          </Grid>
        </div>
      </Container>
  </div>
  )
}
