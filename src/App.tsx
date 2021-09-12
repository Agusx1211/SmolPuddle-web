
import './App.css'
import { Header } from './components/Header'
import { HashRouter, Route } from 'react-router-dom'
import { createTheme, ThemeProvider } from '@material-ui/core'
import { CreateOrderModal } from './components/modal/CreateOrderModal'
import { ItemOrCollection } from './components/ItemOrCollection'

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
            path={["/:collection/:id", "/:collection"]}
            strict={true}
          >
            <ItemOrCollection />
          </Route>
        </HashRouter>
      </ThemeProvider>
    </div>
  );
}

export default App
