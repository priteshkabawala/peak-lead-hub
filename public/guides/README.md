# Lead guide PDFs

These PDFs are emailed automatically to new leads, matched to the lead's LinkedIn
campaign. Drop the files here with exactly these filenames (the automation in
`src/app/api/lead-automation/route.ts` maps campaign → filename):

| Campaign                     | Filename                  |
|------------------------------|---------------------------|
| Retire at 57                 | `retire-at-57.pdf`        |
| Combine Your Pension Pots    | `combine-your-pensions.pdf` |
| Your 12-Minute Guide         | `your-12-minute-guide.pdf` |
| (fallback, any other/none)   | `default-guide.pdf`       |

Once added and deployed, they're served at e.g.
`https://peak-lead-hub.vercel.app/guides/retire-at-57.pdf` and attached to the
welcome email. Keep each PDF reasonably small (ideally < 5 MB) for email delivery.
