export const pad2 = (n: number): string => String(n).padStart(2, '0')

export const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err)

export const round = (v: string | number, precision = 2): number => {
  const scaling = 10 ** precision
  return (
    Math.round((parseFloat(v.toString()) + Number.EPSILON) * scaling) / scaling
  )
}

export const formatDate = (date: Date, withHour = false): string => {
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hour = pad2(date.getHours())
  const minute = pad2(date.getMinutes())
  const second = pad2(date.getSeconds())
  return withHour
    ? `${year}-${month}-${day} ${hour}:${minute}:${second}`
    : `${year}-${month}-${day}`
}

export const formatTimestamp = (date: Date): string =>
  `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}_${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`

const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate()

export const addMonths = (inputDate: Date, months: number): Date => {
  const originalDay = inputDate.getDate()
  const date = new Date(inputDate.getTime())
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  date.setDate(
    Math.min(
      originalDay,
      getDaysInMonth(date.getFullYear(), date.getMonth() + 1),
    ),
  )
  return date
}
