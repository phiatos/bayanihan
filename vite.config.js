import { defineConfig } from 'vite';

export default defineConfig({
  // Configure base path if your project is served from a subdirectory.
  // Set to '/' if your project is deployed at the root of your domain (e.g., example.com).
  // Keep '/bayanihan/' if your project will be deployed at example.com/bayanihan/.
  base: '/bayanihan/', // Or '/' if deployed at root

  build: {
    outDir: 'dist', 
    rollupOptions: {
      input: {
        main: 'index.html', // This should be your primary entry point
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
        callfordonations: 'pages/callfordonations.html',
        reliefsRequest: 'pages/reliefsRequest.html',
        reliefsLog: 'pages/reliefsLog.html',
        reportsSubmission: 'pages/reportsSubmission.html',
        reportsSummary: 'pages/reportsSummary.html',
        reportsVerification: 'pages/reportsVerification.html',
        volunteergroupmanagement: 'pages/volunteergroupmanagement.html', 
      }
    }
  },
  // You can add other configurations here, such as:
  // plugins: [], // For Vite plugins
  // server: {
  //   port: 3000, // Customize dev server port
  //   open: true, // Automatically open browser on dev server start
  // },
});