import React from 'react'
import { Grid, Link, makeStyles, Typography } from "@material-ui/core"
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
  "Agusx1211",
  "PhABCD",
  "Peterk",
  "_kevcas"
]).map((c) => ({ c: c, r: Math.random() })).sort((a, b) => a.r - b.r).map((c) => c.c)
const spacedAuthors = [...authors.slice(0, 3), "", authors[3]]

export function Footer() {
  const classes = useStyles()

  const format = (str: any) => <Typography variant="subtitle2" align="center" color="textSecondary">{str}</Typography>

  return <footer className={classes.footer}>
    <Typography variant="subtitle1" align="center" color="textSecondary" gutterBottom>
      <Grid container spacing={1} justifyContent="center">
        <Grid item>Made with love by</Grid>
        {spacedAuthors.map((c) => {
          if (c === '') return <Grid item key={`space`}>{"&"}</Grid>
          return <Grid item key={`author-${c}`}>
            <Link key={`a1`} color="inherit" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/${c}`}>@{c}</Link>
          </Grid>
        })}
      </Grid>
    </Typography>
    <Typography variant="subtitle1" align="center" color="textSecondary" component="p">
      The software is provided "as is", without warranty of any kind, express or implied.
    </Typography>
    <br/>
    <Grid container spacing={2} justifyContent="center">
      <Grid item>{format(<Link color="inherit" target="_blank" rel="noopener noreferrer" href="https://github.com/Agusx1211/smolpuddle">Github contracts</Link>)}</Grid>
      <Grid item>{format(<Link color="inherit" target="_blank" rel="noopener noreferrer" href="https://github.com/Agusx1211/smolpuddle-web">Github web</Link>)}</Grid>
      <Grid item>{format(<Link color="inherit" target="_blank" rel="noopener noreferrer" href={`${EXPLORER_ADDR}/address/${SmolPuddleContract}`}>Contract</Link>)}</Grid>
      <Grid item>{format(<Link color="inherit" target="_blank" rel="noopener noreferrer" href="https://forms.gle/A3ZtX7LS46Mghzsu5">Request token list</Link>)}</Grid>
      <Grid item>{format(<Link color="inherit" target="_blank" rel="noopener noreferrer" href="https://discord.gg/Z4UFASn3Mq">Discord</Link>)}</Grid>
    </Grid>
    <br/>
  </footer>
}
