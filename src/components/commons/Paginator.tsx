import { Box, Button } from "@material-ui/core"
import { useEffect, useMemo } from "react"
import { useHistory, useLocation } from "react-router-dom"

export const DefaultPageSize = 9

export type Page = { start?: number, end?: number }

export function Paginator(props: { size?: number, total: number, onPage: (event: Page) => void }) {
  const { total, onPage, size } = props

  const history = useHistory()
  const location = useLocation()

  const query = useMemo(() => new URLSearchParams(location.search), [location])

  const rawPage = query.get("page")

  const page = rawPage !== null ? parseInt(rawPage) : 0
  const pageSize = size ?? DefaultPageSize
  const start = page * pageSize
  const end = start + pageSize

  useEffect(() => onPage({start, end}), [start, end, onPage])

  const nextPage = () => {
    history.push(`?page=${page + 1}`)
  }

  const prevPage = () => {
    const next = page - 1
    history.push(next <= 0 ? '?' : `?page=${next}`)
  }

  return <Box display="flex" flexDirection="row-reverse" p={1} m={3}>
    { end < total && <Button onClick={nextPage} variant="outlined" color="primary">Next</Button> }
    { start !== 0 && <Button onClick={prevPage} color="default">Back</Button> }
  </Box>
}
