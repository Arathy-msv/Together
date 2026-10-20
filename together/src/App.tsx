import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { OrgLayout } from './components/org/OrgLayout.tsx'
import { CampaignPage, ReferralCampaignPage } from './pages/Campaign.tsx'
import { ShareWorkspacePage } from './pages/ShareWorkspace.tsx'
import { CampaignWorkspacePage } from './pages/workspace/CampaignWorkspace.tsx'
import { ConfirmPage } from './pages/Confirm.tsx'
import { CreateCampaignPage } from './pages/CreateCampaign.tsx'
import { DashboardPage } from './pages/Dashboard.tsx'
import { ExplorePage } from './pages/Explore.tsx'
import { HowItWorksPage } from './pages/HowItWorks.tsx'
import { AssistantPage } from './pages/org/Assistant.tsx'
import { CampaignScope } from './pages/org/CampaignScope.tsx'
import { LegacyCampaignRedirect, LegacyRedirect } from './pages/org/LegacyRedirect.tsx'
import { OrgHomePage } from './pages/org/OrgHome.tsx'
import { OrgNotFound } from './pages/org/OrgNotFound.tsx'
import { OrgSettingsPage } from './pages/org/OrgSettings.tsx'
import { PlayPage } from './pages/play/PlayPage.tsx'
import { SuccessPage } from './pages/Success.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/o/:organizationSlug" element={<OrgLayout />}>
          <Route index element={<OrgHomePage />} />
          <Route path="campaigns" element={<ExplorePage />} />
          <Route path="campaigns/:id" element={<CampaignScope />}>
            <Route index element={<CampaignPage />} />
            <Route path="play/:game" element={<PlayPage />} />
            <Route path="play" element={<PlayPage />} />
            <Route path="confirm" element={<ConfirmPage />} />
            <Route path="success/:contributionId" element={<SuccessPage />} />
            <Route path="r/:code" element={<ReferralCampaignPage />} />
            <Route path="share" element={<ShareWorkspacePage />} />
            <Route path="share/:code" element={<ShareWorkspacePage />} />
          </Route>
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="dashboard/:campaignId" element={<CampaignWorkspacePage />} />
          <Route path="dashboard/:campaignId/:tab" element={<CampaignWorkspacePage />} />
          <Route path="create" element={<CreateCampaignPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="settings" element={<OrgSettingsPage />} />
          <Route path="*" element={<OrgNotFound kind="page" />} />
        </Route>
        <Route path="/" element={<LegacyRedirect to="/" />} />
        <Route path="/explore" element={<LegacyRedirect to="/campaigns" />} />
        <Route path="/campaigns/:id/*" element={<LegacyCampaignRedirect />} />
        <Route path="*" element={<LegacyRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
