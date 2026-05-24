package com.example.myapplication

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

// Request Body matching the QR JSON and backend endpoint requirements
data class ValidationRequest(
    val order_id: Int,
    val item_id: Int,
    val code: String
)

// Response from backend
data class ValidationResponse(
    val valid: Boolean,
    val message: String,
    val item: String? = null,
    val size: String? = null
)

interface ApiService {
    @POST("api/payments/validate-ticket/")
    suspend fun validateTicket(
        @Header("X-Scanner-Token") token: String,
        @Body request: ValidationRequest
    ): Response<ValidationResponse>
}

object ApiClient {
    private var retrofit: Retrofit? = null

    fun getService(baseUrl: String): ApiService {
        if (retrofit == null || retrofit?.baseUrl().toString() != baseUrl) {
            val formattedUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
            retrofit = Retrofit.Builder()
                .baseUrl(formattedUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!.create(ApiService::class.java)
    }
}
