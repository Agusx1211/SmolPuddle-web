import { Grid, Link, makeStyles, Typography } from "@material-ui/core"
import { Copyright } from "@material-ui/icons"
import { EXPLORER_ADDR, SmolPuddleContract } from "../constants"

const useStyles = makeStyles((theme) => ({
  content: {
    paddingTop: theme.spacing(8),
    paddingBottom: theme.spacing(8),
  },
  footer: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(6),
  },
  unsuported: {
    color: 'red'
  },
  link: {
    textDecoration: 'underline',
    color: 'gray'
  }
}))

const authors = ([
  <Link color="inherit" target="_blank" rel="noopener noreferrer" href="https://twitter.com/Agusx1211">@Agusx1211</Link>,
  <Link color="inherit" target="_blank" rel="noopener noreferrer" href="https://twitter.com/PhABCD">@PhABCD</Link>,
  <Link color="inherit" target="_blank" rel="noopener noreferrer" href="https://twitter.com/Peterk">@Peterk</Link>,
  <Link color="inherit" target="_blank" rel="noopener noreferrer" href="https://twitter.com/_kevcas">@_kevcas</Link>
]).map((c) => ({ c: c, r: Math.random() })).sort((a, b) => a.r - b.r).map((c) => c.c)

export function Footer() {
  const classes = useStyles()

  const format = (str: any) => <Typography variant="subtitle2" align="center" color="textSecondary">{str}</Typography>

  return <footer className={classes.footer}>
    <Typography variant="subtitle1" align="center" color="textSecondary" gutterBottom>
      <Grid container spacing={1} justify="center">
        <Grid item>Made with love by</Grid>
        {authors.map((c, i) => <>{i === 3 ? <Grid item>{"&"}</Grid> : <></>}<Grid item key={`author-${i}`}>{c}</Grid></>)}
      </Grid>
    </Typography>
    <Typography variant="subtitle1" align="center" color="textSecondary" component="p">
      The software is provided "as is", without warranty of any kind, express or implied.
    </Typography>
    <br/>
    <Grid container spacing={2} justify="center">
      <Grid item>{format(<Link color="inherit" target="_blank" rel="noopener noreferrer" href="https://github.com/Agusx1211/smolpuddle">Github contracts</Link>)}</Grid>
      <Grid item>{format(<Link color="inherit" target="_blank" rel="noopener noreferrer" href="https://github.com/Agusx1211/smolpuddle-web">Github web</Link>)}</Grid>
      <Grid item>{format(<Link color="inherit" target="_blank" rel="noopener noreferrer" href={`${EXPLORER_ADDR}/address/${SmolPuddleContract}`}>Contract</Link>)}</Grid>
    </Grid>
    <br/>
  </footer>
}
