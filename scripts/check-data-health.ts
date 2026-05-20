import { buildDataHealthReport } from '../lib/data-health'

async function main() {
  const report = await buildDataHealthReport()
  console.log(JSON.stringify(report, null, 2))

  if (!report.exists || report.adminCount < 1) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
