import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClerkProvider } from '@clerk/react'

const clerkPublishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.CLERK_PUBLISHABLE_KEY ||
  'pk_test_aW1tb3J0YWwtY2hvdy0yMi5jbGVyay5hY2NvdW50cy5kZXYk';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </StrictMode>,
)
