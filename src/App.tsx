import React from 'react'

import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { CreateOrderModal } from './components/modal/CreateOrderModal'
import { ItemOrCollection } from './components/ItemOrCollection'
import { Listings } from './components/Listings'
import { Address } from './components/Address'
import { NotificationsModal } from './components/modal/NotificationsModal'
import { makeStyles } from '@material-ui/core'

const useStyles = makeStyles((theme) => ({
  app: {
    backgroundColor: theme.palette.background.paper,
  },
}))

function App() {
  const styles = useStyles();
  return (
    <div className={styles.app}>
      <CreateOrderModal />
      <NotificationsModal />
      <HashRouter>
        <Header />
        <Switch>
          <Route
            path="/address/:address"
            strict={true}
          >
            <Address />
          </Route>
          <Route
            path={["/:collection/:id", "/:collection"]}
            strict={true}
          >
            <ItemOrCollection />
          </Route>
          <Route
            path="/"
            strict={true}
          >
            <Listings />
          </Route>
        </Switch>
        <Footer />
      </HashRouter>
    </div>
  );
}

export default App
