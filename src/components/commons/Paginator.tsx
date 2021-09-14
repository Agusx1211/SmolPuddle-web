import { Box } from "@material-ui/core"
import { Pagination } from "@material-ui/lab"
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

  const pages = Math.min(1 + Math.floor((total ?? 1) / DefaultPageSize), page + DefaultPageSize * 10)

  const handleChange = ((_: any, pn: number) => {
    const p = pn - 1
    history.push(p <= 0 ? '?' : `?page=${p}`)
  })

  return <Box
    style={{
      margin: 14,
      marginTop: 24
    }}
    flexDirection="row-reverse"
  >
    <Pagination
      variant="outlined"
      color="primary"
      count={pages}
      page={page + 1}
      onChange={handleChange}
      style={{
        float: 'right'
      }}
    />
    <br/>
  </Box>
}
