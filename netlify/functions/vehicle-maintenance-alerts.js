const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { httpMethod } = event;

    // GET /api/vehicle-maintenance-alerts - Get all vehicles with upcoming maintenance
    if (httpMethod === 'GET') {
      // Get all vehicles with maintenance dates
      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select(`
          id,
          plate,
          type,
          road_tax_due,
          insurance_due,
          service_due_km
        `);

      if (vehicleError) throw vehicleError;

      const today = new Date();
      const alerts = [];

      vehicles.forEach(v => {
        // Check road tax due date (7 days before)
        if (v.road_tax_due) {
          const taxDueDate = new Date(v.road_tax_due);
          const daysUntilTax = Math.ceil((taxDueDate - today) / (1000 * 60 * 60 * 24));

          if (daysUntilTax <= 7 && daysUntilTax >= -365) { // Show alerts up to 1 year overdue
            alerts.push({
              id: `tax-${v.id}`,
              vehicle_id: v.id,
              plate: v.plate,
              type: v.type,
              alert_type: 'road_tax',
              message: `Road Tax due ${v.road_tax_due}`,
              due_date: v.road_tax_due,
              days_until_due: daysUntilTax,
              icon: '🚗',
              severity: daysUntilTax < 0 ? 'critical' : daysUntilTax < 3 ? 'urgent' : 'warning'
            });
          }
        }

        // Check insurance due date (7 days before)
        if (v.insurance_due) {
          const insuranceDueDate = new Date(v.insurance_due);
          const daysUntilInsurance = Math.ceil((insuranceDueDate - today) / (1000 * 60 * 60 * 24));

          if (daysUntilInsurance <= 7 && daysUntilInsurance >= -365) {
            alerts.push({
              id: `insurance-${v.id}`,
              vehicle_id: v.id,
              plate: v.plate,
              type: v.type,
              alert_type: 'insurance',
              message: `Insurance due ${v.insurance_due}`,
              due_date: v.insurance_due,
              days_until_due: daysUntilInsurance,
              icon: '📋',
              severity: daysUntilInsurance < 0 ? 'critical' : daysUntilInsurance < 3 ? 'urgent' : 'warning'
            });
          }
        }
      });

      // Get latest service date for each vehicle and check next_service_due
      const { data: mechanics, error: mechanicsError } = await supabase
        .from('mechanics')
        .select(`
          id,
          vehicle_id,
          service_date,
          next_service_due,
          service_type
        `)
        .order('service_date', { ascending: false });

      if (mechanicsError) throw mechanicsError;

      // Group by vehicle_id and get latest record
      const latestByVehicle = {};
      mechanics.forEach(m => {
        if (!latestByVehicle[m.vehicle_id] || new Date(m.service_date) > new Date(latestByVehicle[m.vehicle_id].service_date)) {
          latestByVehicle[m.vehicle_id] = m;
        }
      });

      // Check service due dates
      Object.values(latestByVehicle).forEach(m => {
        if (m.next_service_due) {
          const serviceDueDate = new Date(m.next_service_due);
          const daysUntilService = Math.ceil((serviceDueDate - today) / (1000 * 60 * 60 * 24));

          if (daysUntilService <= 7 && daysUntilService >= -365) {
            const vehicle = vehicles.find(v => v.id === m.vehicle_id);
            if (vehicle) {
              alerts.push({
                id: `service-${m.vehicle_id}`,
                vehicle_id: m.vehicle_id,
                plate: vehicle.plate,
                type: vehicle.type,
                alert_type: 'service',
                message: `Service due ${m.next_service_due}`,
                due_date: m.next_service_due,
                days_until_due: daysUntilService,
                icon: '🛞',
                severity: daysUntilService < 0 ? 'critical' : daysUntilService < 3 ? 'urgent' : 'warning'
              });
            }
          }
        }
      });

      // Sort by severity and days until due
      alerts.sort((a, b) => {
        const severityOrder = { critical: 0, urgent: 1, warning: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return a.days_until_due - b.days_until_due;
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ data: alerts, count: alerts.length })
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
