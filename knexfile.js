require("dotenv").config(); // Loads .env in development

module.exports = {
  development: {
    client: "pg",
    connection: {
      host: process.env.PGHOST || "localhost",
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || "",
      database: process.env.PGDATABASE || "assignment_3",
      port: process.env.PGPORT || 5432
    },
    migrations: {
      directory: "./migrations"
    }
  },

  production: {
    client: "pg",
    connection: {
      host: process.env.RDS_HOSTNAME,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DB_NAME,
      port: process.env.RDS_PORT || 5432,
      ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false 
    },
    migrations: {
      directory: "./migrations"
    }
  }
};
