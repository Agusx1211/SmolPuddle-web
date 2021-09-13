import WarningIcon from '@material-ui/icons/Warning'
import { IconButton, Tooltip } from '@material-ui/core'
import { isDefaultCollection } from '../../stores/CollectionsStore'
import { ARBITRUM_EXPLORER } from '../../stores/Web3Store'


export function Warning(props: { className?: string, collection: string }) {
  const collection = props.collection

  const isDefault = isDefaultCollection(collection)
  const text = `The contract ${collection} is not verified - IMPORTANT: validate token contract before interfacting with it.`

  return <>
    { !isDefault && <Tooltip className={props.className} disableFocusListener disableTouchListener title={text}>
        <IconButton onClick={ () => window.open(`${ARBITRUM_EXPLORER}/address/${collection}`)}>
          <WarningIcon color='secondary' />
        </IconButton>
      </Tooltip>
    }
  </>
}
