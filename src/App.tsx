
import './App.css'
import { Header } from './components/Header'
import { HashRouter, Route } from 'react-router-dom'
import { View } from './components/View'

function App() {
  return (
    <div className="App">
      <HashRouter>
        <Header />
        <Route
          path="/:collection/:id"
        >
          <View />
        </Route>
      </HashRouter>
    </div>
  );
}

export default App
