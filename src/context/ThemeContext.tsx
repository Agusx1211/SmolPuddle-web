import React, { createContext, useState } from 'react';
import { createTheme, ThemeProvider } from '@material-ui/core'

type ThemeContextType = {
  toggle: () => void;
  dark: boolean;
};

export const ThemeContext = createContext<ThemeContextType>({
  toggle: () => null,
  dark: false
});

export const SmolPuddleThemeProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const [dark, setDark] = useState(false);

  const theme = createTheme({
    palette: {
      primary: {
        main: '#3f92e1'
      }
    },
  })

  const darkTheme = createTheme({
    // TODO: redefine here theme variables for dark mode
    palette: {
      type: "dark",
      primary: {
        main: '#3f92e1'
      }
    },
  });

  function toggle() {
    setDark(!dark);
  }

  return (
    <ThemeContext.Provider
      value={{
        toggle,
        dark
      }}
    >
      <ThemeProvider theme={dark ? darkTheme : theme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
