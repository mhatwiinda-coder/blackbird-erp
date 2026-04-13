/**
 * Deployment Version Endpoint
 * Returns current deployment timestamp for cache busting
 * Used by erp.html, driver.html, and service pages to auto-clear cache on new deployment
 */

exports.handler = async (event, context) => {
  try {
    // Generate version based on deployment time or build time
    // In production, this can be replaced with a build-time variable
    const deploymentTime = new Date().toISOString();
    const version = deploymentTime.split('T')[0] + '-' + Math.floor(Math.random() * 10000);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, must-revalidate'
      },
      body: JSON.stringify({
        version: version,
        deploymentTime: deploymentTime,
        timestamp: Date.now()
      })
    };
  } catch (err) {
    console.error('Error getting version:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
