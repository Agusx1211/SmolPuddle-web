import { CircularProgress, makeStyles } from "@material-ui/core"

const useStyles = makeStyles((theme) => ({
  loading: {
    margin: theme.spacing(6)
  }
}))

export function Loading(props: { loading: boolean }) {
  const { loading } = props

  const classes = useStyles()

  return loading ? <CircularProgress className={classes.loading} /> : <></>
}
