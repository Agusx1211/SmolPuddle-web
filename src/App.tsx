
import './App.css'
import { Header } from './components/Header'
import { HashRouter, Route, useParams } from 'react-router-dom'
import { View } from './components/View'
import { createTheme, ThemeProvider } from '@material-ui/core'
import { Collection } from './components/Collection'
import { CreateOrderModal } from './components/modal/CreateOrderModal'
import { ethers } from 'ethers'
import { safe } from './utils'
import { parseAddress } from './types/address'

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f92e1'
    }
  },
})

export function CollectionSubview() {
  const { collection, id } = useParams<{ collection: string, id: string }>()

  const sid = safe(() => ethers.BigNumber.from(id))
  const scollection = parseAddress(collection)

  console.log(sid)
  // TODO: Use props for views and collection
  return <>
    { sid && <View />}
    { (scollection && !sid) && <Collection />}
  </>
}

function App() {
  return (
    <div className="App">
      <ThemeProvider theme={theme}>
        <CreateOrderModal />
        <HashRouter>
          <Header />
          <Route
            path={["/:collection", "/:collection/:id"]}
            strict={true}
          >
            <CollectionSubview />
          </Route>
        </HashRouter>
      </ThemeProvider>
    </div>
  );
}

export default App
