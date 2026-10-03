import { ANNOUNCERS, type Announcer } from "./registry";

/** Seed pages for the Nigerian undergraduate pilot. A seed is not an
 * observation, an open application round, or a finding of eligibility. */
export const PILOT_SOURCE_PAGES: readonly { id: string; announcerId: string; url: string }[] = [
  {
    id: "PX-01",
    announcerId: "ng-uniben",
    url: "https://uniben.edu/",
  },
  {
    id: "PX-02",
    announcerId: "ng-uniben",
    url: "https://news.uniben.edu/",
  },
  {
    id: "PX-03",
    announcerId: "ng-unn",
    url: "https://www.unn.edu.ng/",
  },
  {
    id: "PX-04",
    announcerId: "ng-unilag",
    url: "https://unilag.edu.ng/",
  },
  {
    id: "PX-05",
    announcerId: "ng-ui",
    url: "https://ui.edu.ng/news/scholarship-opportunities",
  },
  {
    id: "PX-06",
    announcerId: "ng-uniport",
    url: "https://www.uniport.edu.ng/",
  },
  {
    id: "PX-07",
    announcerId: "ng-funaab",
    url: "https://funaab.edu.ng/",
  },
  {
    id: "PX-08",
    announcerId: "ng-fme",
    url: "https://education.gov.ng/",
  },
  {
    id: "PX-09",
    announcerId: "ng-ptdf",
    url: "https://scholarship.ptdf.gov.ng/guidelines",
  },
  {
    id: "PX-10",
    announcerId: "ng-mtn",
    url: "https://www.mtn.ng/scholarships/",
  },
  {
    id: "PX-11",
    announcerId: "ng-mtn",
    url: "https://apps.mtn.ng/scholarships/form",
  },
  {
    id: "PX-12",
    announcerId: "ng-shell",
    url: "https://www.shell.com.ng/sustainability/communities/education-programmes/scholarships.html",
  },
  {
    id: "PX-13",
    announcerId: "ng-seplat",
    url: "https://www.seplatenergy.com/news-insights/news/nnpcseplat-jv-national-undergraduate-scholarship-2026/",
  },
  {
    id: "PX-14",
    announcerId: "ng-seplat-academy",
    url: "https://seplatgrowthacademy.com/scholarship/",
  },
  {
    id: "PX-15",
    announcerId: "ng-scholastica",
    url: "https://www.scholastica.ng/",
  },
  {
    id: "PX-16",
    announcerId: "ng-scholastica",
    url: "https://candidate.scholastica.ng/schemes/2026CNLawards",
  },
  {
    id: "PX-17",
    announcerId: "ng-scholastica",
    url: "https://candidate.scholastica.ng/schemes/JBN2026",
  },
  {
    id: "PX-18",
    announcerId: "ng-scholastica",
    url: "https://candidate.scholastica.ng/schemes/oandoscholarship2026",
  },
  {
    id: "PX-19",
    announcerId: "ng-gosef",
    url: "https://www.onosodefoundation.org/gosef2026",
  },
  {
    id: "PX-20",
    announcerId: "ng-femi-bewaji",
    url: "https://www.femibewajifoundation.org/programs/undergraduate",
  },
  {
    id: "PX-21",
    announcerId: "ng-nbf",
    url: "https://nbfafrica.org/the-nbf-undergraduate-scholarship/",
  },
  {
    id: "PX-22",
    announcerId: "ng-nhef",
    url: "https://thenhef.org/expanded-access-2026-nhef-scholars-program-now-open-to-non-partner-universities-48-hour-window/",
  },
  {
    id: "PX-23",
    announcerId: "us-millennium",
    url: "https://www.millenniumfellows.org/apply",
  },
  {
    id: "PX-24",
    announcerId: "ng-dsbsb",
    url: "https://dsbsb.dl.gov.ng/news/4",
  },
  {
    id: "PX-25",
    announcerId: "fr-totalenergies",
    url: "https://csr-ngscholarship.totalenergies.com/",
  },
];

/** Reuse publisher identities while restricting retrieval to these exact pages. */
export function pilotAnnouncers(): Announcer[] {
  return ANNOUNCERS.flatMap((announcer) => {
    const pages = PILOT_SOURCE_PAGES.filter((page) => page.announcerId === announcer.id);
    return pages.length === 0 ? [] : [{ ...announcer, knownPaths: pages.map((page) => page.url) }];
  });
}
