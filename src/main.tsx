import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

/* no StrictMode: its double mount would start two meadows on the same canvas */
createRoot(document.getElementById('root')!).render(<App />);
