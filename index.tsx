import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Use a custom property on the DOM element to store the root instance.
// This prevents creating a new root if hot module replacement (HMR) runs this code again.
const elementWithRoot = rootElement as HTMLElement & { _reactRoot?: any };

if (!elementWithRoot._reactRoot) {
  elementWithRoot._reactRoot = ReactDOM.createRoot(rootElement);
}

elementWithRoot._reactRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals