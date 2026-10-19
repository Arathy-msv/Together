import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell.tsx'
import { CampaignPage } from './pages/Campaign.tsx'
import { ConfirmPage } from './pages/Confirm.tsx'
import { CreateCampaignPage } from './pages/CreateCampaign.tsx'
import { DashboardPage } from './pages/Dashboard.tsx'
import { ExplorePage } from './pages/Explore.tsx'
import { HomePage } from './pages/Home.tsx'
import { NotFoundPage } from './pages/NotFound.tsx'
import { PlayGardenPage } from './pages/PlayGarden.tsx'
import { SuccessPage } from './pages/Success.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/create" element={<CreateCampaignPage />} />
          <Route path="/campaigns/:id" element={<CampaignPage />} />
          <Route path="/campaigns/:id/play" element={<PlayGardenPage />} />
          <Route path="/campaigns/:id/confirm" element={<ConfirmPage />} />
          <Route path="/campaigns/:id/success/:contributionId" element={<SuccessPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
