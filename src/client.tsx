// Must stay the first import: React Scan (dev only) hooks into React
// before react-dom loads. An empty module in production builds.
import 'virtual:react-scan'
import { StartClient } from '@tanstack/react-start/client'
import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'

// Start's default client entry, plus the import above
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
