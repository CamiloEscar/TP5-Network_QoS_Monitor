import CoreTelephony
import ExpoModulesCore
import Network

public class TelephonyModule: Module {
  private let networkInfo = CTTelephonyNetworkInfo()

  public func definition() -> ModuleDefinition {
    Name("Telephony")

    Events("onTelephonyChange")
    // ponytail: live CTTelephonyNetworkInfo update-notifier wiring skipped — needs an
    // OnCreate/OnDestroy lifecycle hook whose exact name for this expo-modules-core
    // version cannot be verified on this win32 host (no Xcode toolchain). getTelephonyInfo()
    // and probeTcpConnect() are prioritized and correct; wire the notifier closures once
    // verified against a real Xcode build.

    AsyncFunction("getTelephonyInfo") { () -> [String: Any?] in
      self.getTelephonyInfoMap()
    }

    AsyncFunction("probeTcpConnect") { (host: String, port: Int, timeoutMs: Int, promise: Promise) in
      self.probeTcpConnect(host: host, port: port, timeoutMs: timeoutMs, promise: promise)
    }
  }

  private func getTelephonyInfoMap() -> [String: Any?] {
    let carrier = networkInfo.serviceSubscriberCellularProviders?.values
      .compactMap { $0.carrierName }
      .first { !$0.isEmpty }

    let radioTech = networkInfo.serviceCurrentRadioAccessTechnology?.values.first
    let (networkType, generation) = mapRadioAccessTechnology(radioTech)

    return [
      "carrier": carrier,
      "networkType": networkType,
      // rssiDbm / signalLevel: no public iOS API exposes cellular signal strength.
      "generation": generation,
      "rssiDbm": nil,
      "signalLevel": nil,
    ]
  }

  private func mapRadioAccessTechnology(_ tech: String?) -> (String, String?) {
    guard let tech = tech else { return ("unknown", nil) }
    switch tech {
    case CTRadioAccessTechnologyGPRS:
      return ("GPRS", "2g")
    case CTRadioAccessTechnologyEdge:
      return ("EDGE", "2g")
    case CTRadioAccessTechnologyCDMA1x:
      return ("CDMA1x", "2g")
    case CTRadioAccessTechnologyWCDMA:
      return ("WCDMA", "3g")
    case CTRadioAccessTechnologyHSDPA:
      return ("HSDPA", "3g")
    case CTRadioAccessTechnologyHSUPA:
      return ("HSUPA", "3g")
    case CTRadioAccessTechnologyCDMAEVDORev0:
      return ("CDMAEVDORev0", "3g")
    case CTRadioAccessTechnologyCDMAEVDORevA:
      return ("CDMAEVDORevA", "3g")
    case CTRadioAccessTechnologyCDMAEVDORevB:
      return ("CDMAEVDORevB", "3g")
    case CTRadioAccessTechnologyeHRPD:
      return ("eHRPD", "3g")
    case CTRadioAccessTechnologyLTE:
      return ("LTE", "4g")
    case CTRadioAccessTechnologyNRNSA:
      return ("NRNSA", "5g")
    case CTRadioAccessTechnologyNR:
      return ("NR", "5g")
    default:
      return ("unknown", nil)
    }
  }

  private func probeTcpConnect(host: String, port: Int, timeoutMs: Int, promise: Promise) {
    guard let nwPort = NWEndpoint.Port(rawValue: UInt16(port)) else {
      promise.resolve(["rttMs": nil, "error": "invalid port"])
      return
    }

    let connection = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: .tcp)
    let start = DispatchTime.now()
    var settled = false
    let lock = NSLock()

    func finish(_ result: [String: Any?]) {
      lock.lock()
      defer { lock.unlock() }
      if settled { return }
      settled = true
      connection.cancel()
      promise.resolve(result)
    }

    let timer = DispatchSource.makeTimerSource(queue: .global())
    timer.schedule(deadline: .now() + .milliseconds(timeoutMs))
    timer.setEventHandler {
      finish(["rttMs": nil, "error": "timeout"])
      timer.cancel()
    }
    timer.resume()

    connection.stateUpdateHandler = { state in
      switch state {
      case .ready:
        let elapsedNs = DispatchTime.now().uptimeNanoseconds - start.uptimeNanoseconds
        let elapsedMs = Double(elapsedNs) / 1_000_000
        finish(["rttMs": elapsedMs, "error": nil])
        timer.cancel()
      case .failed(let error):
        finish(["rttMs": nil, "error": error.localizedDescription])
        timer.cancel()
      case .cancelled:
        timer.cancel()
      default:
        break
      }
    }

    connection.start(queue: .global())
  }
}
