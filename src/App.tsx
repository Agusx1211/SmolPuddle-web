
import './App.css'
import { Header } from './components/Header'
import { HashRouter, Route } from 'react-router-dom'
import { View } from './components/View'
import { createTheme, ThemeProvider } from '@material-ui/core'
import { Collection } from './components/Collection'
import { CreateOrderModal } from './components/modal/CreateOrderModal'

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f92e1'
    }
  },
})

function App() {
  return (
    <div className="App">
      <ThemeProvider theme={theme}>
        <CreateOrderModal />
        <HashRouter>
          <Header />
          <Route
            path="/:collection/:id"
            strict={true}
          >
            <View />
          </Route>
          <Route
            path="/:collection"
            strict={true}
          >
            <Collection />
          </Route>
        </HashRouter>
      </ThemeProvider>
    </div>
  );
}

export default App
