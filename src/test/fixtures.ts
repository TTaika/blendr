import type { Company } from '../../shared/types';

// Fixed, made-up company data for component and matching tests, so tests don't depend on the
// real (and changeable) test companies in src/data/companies.ts.
export const fixtureCompany: Company = {
  id: 'fixture-co',
  name: 'Fixture Co',
  values: ['Customer trust', 'Fast execution', 'Simple pricing'],
  stage: 'seed',
  raise: [2500, 2500], // exact amount: €2.5M
  keywords: [
    { id: 'climate', reason: 'Balances the electricity grid with flexible demand from buildings.' },
    { id: 'b2b-saas', reason: 'Sold as software to property owners and energy operators.' },
    { id: 'usage-based', reason: 'Takes a share of every flexibility trade it executes.' },
    { id: 'nordics', reason: 'Live in Finland and Sweden, expanding to Norway next.' },
    { id: 'hands-on', reason: 'Wants weekly sparring on enterprise sales.' },
    { id: 'technical', reason: 'Both founders are power-systems engineers.' },
  ],
  problem: 'Grids need flexibility to absorb wind and solar, but thousands of buildings with controllable heating sit idle.',
  solution: 'We connect building automation to reserve markets and shift heating loads automatically without hurting comfort.',
  team: 'CEO led energy trading at a Nordic utility; CTO built the control stack at a building-automation vendor. Team of 9.',
  keyNumbers: [
    { label: 'ARR', value: '€620k' },
    { label: 'Growth', value: '14% MoM' },
    { label: 'Buildings connected', value: '410' },
  ],
  whyInvest: 'Reserve-market prices doubled in two years and we are integrated with the three largest Nordic building-automation vendors.',
  website: 'https://fixtureco.example',
  contact: { name: 'Aino Laakso', title: 'CEO & co-founder', email: 'aino@fixtureco.example', phone: '+358 40 000 0101' },
};

export const fixtureCompany2: Company = {
  id: 'fixture-co-2',
  name: 'Second Fixture',
  values: ['Craftsmanship', 'Integrity', 'Long-term thinking'],
  stage: 'series-a',
  raise: [5000, 10000],
  keywords: [
    { id: 'cybersecurity', reason: 'Security awareness training.' },
    { id: 'ai-ml', reason: 'Generates simulations from real attack data.' },
    { id: 'b2b', reason: 'Sold to companies and public-sector organisations.' },
    { id: 'europe', reason: 'Customers in 9 EU countries.' },
    { id: 'data-driven', reason: 'Reports click-rate outcomes to every customer monthly.' },
  ],
  problem: 'Generic security trainings bore employees, and click rates on real phishing barely move.',
  solution: 'We generate simulations from the attacks hitting each company and coach people in the moment.',
  team: 'CEO ran red-team services at a Nordic bank; CTO previously led research at a security vendor. 27 people.',
  keyNumbers: [
    { label: 'ARR', value: '€3.8M' },
    { label: 'Customers', value: '230' },
  ],
  whyInvest: 'NIS2 makes security training mandatory for thousands of EU companies, and we are on two national procurement frameworks.',
  website: 'https://secondfixture.example',
  contact: { name: 'Lauri Heino', title: 'CEO & co-founder', email: 'lauri@secondfixture.example' },
};

export const fixtureCompanies: Company[] = [fixtureCompany, fixtureCompany2];

export const FIXTURE_COMPANY_BY_ID: Map<string, Company> = new Map(fixtureCompanies.map((c) => [c.id, c]));
