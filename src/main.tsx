import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { iniciarCl4p } from './services/cl4pPantry';

iniciarCl4p();

createRoot(document.getElementById('root')!).render(<App />);
