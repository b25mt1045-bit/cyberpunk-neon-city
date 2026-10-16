import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Atmosphere } from './Atmosphere'
import { City } from './City'
import { Ground } from './Ground'
import { Landmarks } from './PortfolioLandmarks'
import { Jellyfish } from './Jellyfish'
import { Orbit } from './Orbit'
import { Plaza } from './Plaza'
import { RoofLights } from './RoofLights'
import { SkyTraffic } from './SkyTraffic'
import { Traffic } from './Traffic'
import { aboveClouds } from './landmarks'
import { useApp } from '../store'
import { SETTINGS } from '../quality'

export function World() {
  const { city: cityDensity, traffic } = SETTINGS[useApp((s) => s.tier)]
  // once the camera is above the cloud deck, the whole city is hidden under it
  const city = useRef<Group>(null)
  useFrame(({ camera }) => {
    city.current!.visible = !aboveClouds(camera.position.y)
  })

  return (
    <>
      <Atmosphere />
      <Orbit />
      <group ref={city}>
        <Ground />
        <Plaza />
        <City density={cityDensity} />
        <Traffic density={traffic} />
        <RoofLights density={cityDensity} />
        <SkyTraffic density={traffic} />
        <Landmarks />
        <Jellyfish />
      </group>
    </>
  )
}
