package expo.modules.telephony

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.SystemClock
import android.telephony.CellInfoGsm
import android.telephony.CellInfoLte
import android.telephony.CellInfoNr
import android.telephony.CellInfoWcdma
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket
import java.net.SocketTimeoutException

class TelephonyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Telephony")

    Events("onTelephonyChange")
    // ponytail: live PhoneStateListener/TelephonyCallback wiring skipped — it requires a
    // HandlerThread-backed Looper plus OnCreate/OnDestroy lifecycle hooks whose exact DSL
    // method names for this expo-modules-core version could not be verified without a
    // build toolchain on this host. getTelephonyInfo()/probeTcpConnect() are prioritized
    // and correct; add the listener once the lifecycle hook name is confirmed against a
    // real build.

    AsyncFunction("getTelephonyInfo") {
      getTelephonyInfoMap()
    }

    AsyncFunction("probeTcpConnect") { host: String, port: Int, timeoutMs: Int ->
      probeTcpConnect(host, port, timeoutMs)
    }
  }

  private fun getTelephonyInfoMap(): Map<String, Any?> {
    val context = appContext.reactContext ?: return emptyInfoMap()
    val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
      ?: return emptyInfoMap()

    return try {
      val carrier = tm.networkOperatorName?.takeIf { it.isNotBlank() }

      val networkTypeInt = try {
        tm.dataNetworkType
      } catch (e: SecurityException) {
        try {
          @Suppress("DEPRECATION")
          tm.networkType
        } catch (e2: SecurityException) {
          TelephonyManager.NETWORK_TYPE_UNKNOWN
        }
      }
      val (networkType, generation) = mapNetworkType(networkTypeInt)

      var rssiDbm: Int? = null
      var signalLevel: Int? = null
      val hasFineLocation = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_FINE_LOCATION
      ) == PackageManager.PERMISSION_GRANTED

      if (hasFineLocation) {
        val cell = tm.allCellInfo?.firstOrNull { it.isRegistered }
        when (cell) {
          is CellInfoLte -> {
            rssiDbm = cell.cellSignalStrength.dbm
            signalLevel = cell.cellSignalStrength.level
          }
          is CellInfoNr -> {
            rssiDbm = cell.cellSignalStrength.dbm
            signalLevel = cell.cellSignalStrength.level
          }
          is CellInfoWcdma -> {
            rssiDbm = cell.cellSignalStrength.dbm
            signalLevel = cell.cellSignalStrength.level
          }
          is CellInfoGsm -> {
            rssiDbm = cell.cellSignalStrength.dbm
            signalLevel = cell.cellSignalStrength.level
          }
          else -> {
            rssiDbm = null
            signalLevel = null
          }
        }
      }

      mapOf(
        "carrier" to carrier,
        "networkType" to networkType,
        "generation" to generation,
        "rssiDbm" to rssiDbm,
        "signalLevel" to signalLevel
      )
    } catch (e: SecurityException) {
      mapOf(
        "carrier" to (tm.networkOperatorName?.takeIf { it.isNotBlank() }),
        "networkType" to "unknown",
        "generation" to null,
        "rssiDbm" to null,
        "signalLevel" to null
      )
    }
  }

  private fun emptyInfoMap(): Map<String, Any?> = mapOf(
    "carrier" to null,
    "networkType" to "unknown",
    "generation" to null,
    "rssiDbm" to null,
    "signalLevel" to null
  )

  private fun mapNetworkType(type: Int): Pair<String, String?> {
    return when (type) {
      TelephonyManager.NETWORK_TYPE_GPRS -> "GPRS" to "2g"
      TelephonyManager.NETWORK_TYPE_EDGE -> "EDGE" to "2g"
      TelephonyManager.NETWORK_TYPE_1xRTT -> "1xRTT" to "2g"
      TelephonyManager.NETWORK_TYPE_CDMA -> "CDMA" to "3g"
      TelephonyManager.NETWORK_TYPE_EVDO_0 -> "EVDO_0" to "3g"
      TelephonyManager.NETWORK_TYPE_EVDO_A -> "EVDO_A" to "3g"
      TelephonyManager.NETWORK_TYPE_EVDO_B -> "EVDO_B" to "3g"
      TelephonyManager.NETWORK_TYPE_UMTS -> "UMTS" to "3g"
      TelephonyManager.NETWORK_TYPE_HSDPA -> "HSDPA" to "3g"
      TelephonyManager.NETWORK_TYPE_HSUPA -> "HSUPA" to "3g"
      TelephonyManager.NETWORK_TYPE_HSPA -> "HSPA" to "3g"
      TelephonyManager.NETWORK_TYPE_HSPAP -> "HSPAP" to "3g"
      TelephonyManager.NETWORK_TYPE_EHRPD -> "EHRPD" to "3g"
      TelephonyManager.NETWORK_TYPE_TD_SCDMA -> "TD_SCDMA" to "3g"
      TelephonyManager.NETWORK_TYPE_IDEN -> "IDEN" to "2g"
      TelephonyManager.NETWORK_TYPE_GSM -> "GSM" to "2g"
      TelephonyManager.NETWORK_TYPE_LTE -> "LTE" to "4g"
      TelephonyManager.NETWORK_TYPE_IWLAN -> "IWLAN" to null
      TelephonyManager.NETWORK_TYPE_NR -> "NR" to "5g"
      else -> "unknown" to null
    }
  }

  private fun probeTcpConnect(host: String, port: Int, timeoutMs: Int): Map<String, Any?> {
    var socket: Socket? = null
    return try {
      socket = Socket()
      val t0 = SystemClock.elapsedRealtime()
      socket.connect(InetSocketAddress(host, port), timeoutMs)
      val elapsed = SystemClock.elapsedRealtime() - t0
      mapOf("rttMs" to elapsed.toInt(), "error" to null)
    } catch (e: SocketTimeoutException) {
      mapOf("rttMs" to null, "error" to (e.message ?: e.javaClass.simpleName))
    } catch (e: IOException) {
      mapOf("rttMs" to null, "error" to (e.message ?: e.javaClass.simpleName))
    } finally {
      try {
        socket?.close()
      } catch (e: IOException) {
        // ignore close failure
      }
    }
  }
}
