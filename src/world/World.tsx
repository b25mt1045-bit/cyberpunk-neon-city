import { Atmosphere } from './Atmosphere'
import { City } from './City'
import { Ground } from './Ground'

export function World() {
  return (
    <>
      <Atmosphere />
      <Ground />
      <City />
    </>
  )
}
