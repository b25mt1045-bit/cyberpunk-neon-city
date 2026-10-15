import { Atmosphere } from './Atmosphere'
import { City } from './City'
import { Ground } from './Ground'
import { Plaza } from './Plaza'
import { RoofLights } from './RoofLights'
import { SkyTraffic } from './SkyTraffic'
import { Traffic } from './Traffic'

export function World() {
  return (
    <>
      <Atmosphere />
      <Ground />
      <Plaza />
      <City />
      <Traffic />
      <RoofLights />
      <SkyTraffic />
    </>
  )
}
