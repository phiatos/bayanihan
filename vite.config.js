import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bayanihan/', // Or '/' if deployed at root

  build: {
    outDir: 'dist', 
    rollupOptions: {
      input: {
        main: 'index.html', // primary entry point
        login: 'pages/login.html', 
        sidebar: 'components/sidebar.html',
        profile: 'pages/profile.html',
        dashboard: 'pages/dashboard.html', 
        activation: 'pages/activation.html',
        inkind: 'pages/inkind.html',
        monetary: 'pages/monetary.html',
        rdana: 'pages/rdana.html',
        rdanaVerification: 'pages/rdanaVerification.html',
        rdanaLog: 'pages/rdanaLog.html',
        callfordonation: 'pages/callfordonation.html',
        reliefsRequest: 'pages/reliefsRequest.html',
        reliefsLog: 'pages/reliefsLog.html',
        reportsSubmission: 'pages/reportsSubmission.html',
        reportsSummary: 'pages/reportsSummary.html',
        reportsVerification: 'pages/reportsVerification.html',
        volunteergroupmanagement: 'pages/volunteergroupmanagement.html', 
      }
    }
  },
});