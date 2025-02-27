const path = require('path');

module.exports = {
  "parser": "babel-eslint",
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true,
      "experimentalObjectRestSpread": true
    }
  },
  "env": {
    "es6": true,
    "browser": true,
    "node": true,
    "mocha": true
  },
  "globals": {
    "expect": true,
    "jest": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings"
  ],
  "plugins": [
    "react",
    "babel",
    "import"
  ],

  "rules": {
    "comma-dangle": 0,
    "no-mixed-spaces-and-tabs": 0,
    "no-alert": 0,
    "import/no-named-as-default": 0,
    "import/default": 2,
    "import/named": 2,
    "import/no-unresolved": 2,
    "no-underscore-dangle": 0,
    "no-case-declarations": 0,
    "strict": 0,
    "no-console": 1,
    "no-trailing-spaces": 0,
    "react/display-name": 0,
    "react/jsx-no-undef": 2,
    "react/jsx-sort-prop-types": 0,
    "react/jsx-sort-props": 0,
    "react/jsx-uses-react": 1,
    "react/jsx-uses-vars": 1,
    "react/no-did-mount-set-state": 1,
    "react/no-did-update-set-state": 1,
    "react/no-unknown-property": 1,
    "react/prop-types": 0,
    "react/react-in-jsx-scope": 1,
    "react/self-closing-comp": 0,
    "react/sort-comp": 0,
    "react/jsx-wrap-multilines": 1
  },
  "settings": {
    "import/resolver": {
      "webpack": {
        "config": path.join(__dirname, "./webpack/webpack.base.js")
      }
    }
  }
}