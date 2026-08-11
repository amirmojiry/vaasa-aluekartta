import type {
  MajorAreaPopulationHistoryDatabase,
  PopulationObservation,
} from '@/domain/populationHistory'
import type { AreaStatisticsDatabase, CompactAreaStatisticRecord } from '@/domain/statistics'

export interface CityStatisticsSnapshot {
  population: number
  populationYear: number
  studentShare2013: number
  unemployment2013: number
  employedShare2013: number
  language2015: {
    finnish: number
    swedish: number
    other: number
  }
  populationHistory: PopulationObservation[]
}

const MAJOR_AREA_PREFIX = 'suuralue:'
const MIN_COMPARABLE_HISTORY_YEAR = 2013

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10
}

function majorAreaStatistics(database: AreaStatisticsDatabase): CompactAreaStatisticRecord[] {
  return Object.entries(database.areas)
    .filter(([key]) => key.startsWith(MAJOR_AREA_PREFIX))
    .map(([, record]) => record)
}

function populationWeightedAverage(
  records: CompactAreaStatisticRecord[],
  selector: (record: CompactAreaStatisticRecord) => number,
): number {
  const population = records.reduce((total, record) => total + record.p, 0)
  if (population <= 0) throw new Error('City statistics cannot be weighted without population data')

  const weightedTotal = records.reduce((total, record) => total + selector(record) * record.p, 0)
  return roundPercent(weightedTotal / population)
}

function aggregatePopulationHistory(
  database: MajorAreaPopulationHistoryDatabase,
): PopulationObservation[] {
  const histories = Object.values(database.areas)
  if (!histories.length) return []

  const totals = new Map<number, { population: number; areaCount: number }>()
  for (const observations of histories) {
    for (const [year, population] of observations) {
      if (year < MIN_COMPARABLE_HISTORY_YEAR) continue
      const current = totals.get(year) ?? { population: 0, areaCount: 0 }
      current.population += population
      current.areaCount += 1
      totals.set(year, current)
    }
  }

  return [...totals.entries()]
    .filter(([, value]) => value.areaCount === histories.length)
    .sort(([leftYear], [rightYear]) => leftYear - rightYear)
    .map(([year, value]) => ({ year, population: value.population }))
}

export function buildCityStatisticsSnapshot(
  statisticsDatabase: AreaStatisticsDatabase,
  populationHistoryDatabase: MajorAreaPopulationHistoryDatabase,
): CityStatisticsSnapshot {
  const records = majorAreaStatistics(statisticsDatabase)
  if (!records.length) throw new Error('No major-area statistics are available for city aggregation')

  const populationHistory = aggregatePopulationHistory(populationHistoryDatabase)
  const latestPopulation = populationHistory.at(-1)
  if (!latestPopulation) throw new Error('No comparable city population history is available')

  return {
    population: latestPopulation.population,
    populationYear: latestPopulation.year,
    studentShare2013: populationWeightedAverage(records, (record) => record.s),
    unemployment2013: populationWeightedAverage(records, (record) => record.u),
    employedShare2013: populationWeightedAverage(records, (record) => record.e),
    language2015: {
      finnish: populationWeightedAverage(records, (record) => record.l[0]),
      swedish: populationWeightedAverage(records, (record) => record.l[1]),
      other: populationWeightedAverage(records, (record) => record.l[2]),
    },
    populationHistory,
  }
}
