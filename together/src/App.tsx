import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { OrgLayout, OrgWorkspaceRedirect } from './components/org/OrgLayout.tsx'
import { CampaignPage, ReferralCampaignPage } from './pages/Campaign.tsx'
import { ConfirmPage } from './pages/Confirm.tsx'
import { CreateCampaignPage } from './pages/CreateCampaign.tsx'
import { DashboardPage } from './pages/Dashboard.tsx'
import { ExplorePage } from './pages/Explore.tsx'
import { HowItWorksPage } from './pages/HowItWorks.tsx'
import { AssistantPage } from './pages/org/Assistant.tsx'
import { CampaignScope } from './pages/org/CampaignScope.tsx'
import { LegacyCampaignRedirect, LegacyPublicRedirect, LegacyWorkspaceRedirect } from './pages/org/LegacyRedirect.tsx'
import { OrgAboutPage } from './pages/org/OrgAbout.tsx'
import { SupporterHistoryPage } from './pages/org/SupporterHistory.tsx'
import { OrgHomePage } from './pages/org/OrgHome.tsx'
import { OrgNotFound } from './pages/org/OrgNotFound.tsx'
import { OrganizationSettingsPage, WebsiteEditorPage } from './pages/org/OrgSettings.tsx'
import { OnboardingPage } from './pages/platform/Onboarding.tsx'
import { PlansPage } from './pages/platform/PlansPage.tsx'
import { PlatformHomePage } from './pages/platform/PlatformHome.tsx'
import { PlatformLayout } from './pages/platform/PlatformLayout.tsx'
import { StartPage } from './pages/platform/StartPage.tsx'
import { WorkspaceEntryPage } from './pages/platform/WorkspaceEntry.tsx'
import { PlayPage } from './pages/play/PlayPage.tsx'
import { ShareWorkspacePage } from './pages/ShareWorkspace.tsx'
import { SuccessPage } from './pages/Success.tsx'
import { CampaignWorkspacePage } from './pages/workspace/CampaignWorkspace.tsx'
import { PlanPage } from './pages/workspace/PlanPage.tsx'
import { WebsiteFeaturesPage } from './pages/workspace/WebsiteFeaturesPage.tsx'
import { PartnerOffersPage } from './pages/workspace/PartnerOffersPage.tsx'
import { PublicOffersPage, StoreValuePurchasePage, VoucherWalletPage } from './pages/org/PartnerOffersPublic.tsx'
import { WorkspaceLayout } from './pages/workspace/WorkspaceLayout.tsx'
import { WorkspaceOverviewPage } from './pages/workspace/WorkspaceOverview.tsx'
import { MembersPage } from './pages/workspace/MembersPage.tsx'
import { DemoIdentitiesPage } from './pages/platform/DemoIdentities.tsx'
import { MerchantPortalPage } from './pages/platform/MerchantPortal.tsx'
import { PlatformAdminPage } from './pages/platform/PlatformAdmin.tsx'
import { useCurrentUser } from './hooks/useIdentity.ts'

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

/** Remounting on identity change clears any private in-memory views from the previous identity. */
function AppRoutes() {
  const user = useCurrentUser()
  return (
      <Routes key={user?.id ?? 'guest'}>
        {/* 1. Together platform website */}
        <Route element={<PlatformLayout />}>
          <Route path="/" element={<PlatformHomePage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/start" element={<StartPage />} />
          <Route path="/start/:organizationId" element={<OnboardingPage />} />
          <Route path="/workspace" element={<WorkspaceEntryPage />} />
          <Route path="/demo-identities" element={<DemoIdentitiesPage />} />
          <Route path="/merchant" element={<MerchantPortalPage />} />
          <Route path="/admin" element={<PlatformAdminPage />} />
          <Route path="*" element={<OrgNotFound kind="page" />} />
        </Route>

        {/* 2. Each organization's public website */}
        <Route path="/o/:organizationSlug" element={<OrgLayout />}>
          <Route index element={<OrgHomePage />} />
          <Route path="about" element={<OrgAboutPage />} />
          <Route path="my-history" element={<SupporterHistoryPage />} />
          <Route path="offers" element={<PublicOffersPage />} />
          <Route path="offers/:offerId/buy" element={<StoreValuePurchasePage />} />
          <Route path="my-vouchers" element={<VoucherWalletPage />} />
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
          <Route path="dashboard" element={<OrgWorkspaceRedirect section="campaigns" />} />
          <Route path="dashboard/:campaignId" element={<OrgWorkspaceRedirect section="campaign" />} />
          <Route path="dashboard/:campaignId/:tab" element={<OrgWorkspaceRedirect section="campaign" />} />
          <Route path="create" element={<OrgWorkspaceRedirect section="campaigns/new" />} />
          <Route path="assistant" element={<OrgWorkspaceRedirect section="assistant" />} />
          <Route path="settings" element={<OrgWorkspaceRedirect section="website" />} />
          <Route path="*" element={<OrgNotFound kind="page" />} />
        </Route>

        {/* 3. Each organization's management workspace */}
        <Route path="/workspace/:organizationId" element={<WorkspaceLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<WorkspaceOverviewPage />} />
          <Route path="website" element={<WebsiteEditorPage />} />
          <Route path="campaigns" element={<DashboardPage />} />
          <Route path="campaigns/new" element={<CreateCampaignPage />} />
          <Route path="campaigns/:campaignId" element={<CampaignWorkspacePage />} />
          <Route path="campaigns/:campaignId/:tab" element={<CampaignWorkspacePage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="settings" element={<OrganizationSettingsPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="features" element={<WebsiteFeaturesPage />} />
          <Route path="offers" element={<PartnerOffersPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="*" element={<OrgNotFound kind="page" />} />
        </Route>

        {/* Links from before the platform restructure */}
        <Route path="/explore" element={<LegacyPublicRedirect to="/campaigns" />} />
        <Route path="/how-it-works" element={<Navigate to="/#how-it-works" replace />} />
        <Route path="/dashboard" element={<LegacyWorkspaceRedirect section="campaigns" />} />
        <Route path="/create" element={<LegacyWorkspaceRedirect section="campaigns/new" />} />
        <Route path="/campaigns/:id/*" element={<LegacyCampaignRedirect />} />
      </Routes>
  )
}
