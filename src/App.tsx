import React from 'react'

import './App.css'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { createTheme, ThemeProvider } from '@material-ui/core'
import { CreateOrderModal } from './components/modal/CreateOrderModal'
import { CreateTransferModal } from './components/modal/TransferModal'
import { ItemOrCollection } from './components/ItemOrCollection'
import { Listings } from './components/Listings'
import { Address } from './components/Address'
import { NotificationsModal } from './components/modal/NotificationsModal'
import { Search } from './components/Search'
import { useStore } from './stores'
import { OrderbookStore } from './stores/OrderbookStore'

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f92e1'
    }
  },
})

function App() {
  // We turn on the orderbook-store so it
  // starts listening to Waku and to the API
  useStore(OrderbookStore)

  return (
    <div className="App">
      <ThemeProvider theme={theme}>
        <CreateOrderModal />
        <CreateTransferModal />
        <NotificationsModal />
        <HashRouter>
          <Route
            path={["/search/:search", "/"]}
          >
            <Header />
          </Route>
            <Switch>
              <Route
                path="/address/:address"
                strict={true}
              >
                <Address />
              </Route>
              <Route
                path="/search/:search"
                strict={true}
              >
                <Search />
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
      </ThemeProvider>
    </div>
  );
}

export default App
