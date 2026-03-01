export const round = (v: string | number, precision = 2): number => {
  const scaling = 10 ** precision
  return (
    Math.round((parseFloat(v.toString()) + Number.EPSILON) * scaling) / scaling
  )
}

export const formatDate = (date: Date, withHour = false): string => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  return withHour
    ? `${year}-${month}-${day} ${hour}:${minute}:${second}`
    : `${year}-${month}-${day}`
}

const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate()

export const addMonths = (inputDate: Date, months: number): Date => {
  const date = inputDate
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  date.setDate(
    Math.min(
      inputDate.getDate(),
      getDaysInMonth(date.getFullYear(), date.getMonth() + 1),
    ),
  )
  return date
}
