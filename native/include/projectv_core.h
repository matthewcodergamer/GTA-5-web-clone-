#pragma once
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
uint32_t projectv_api_version(void);
uint32_t projectv_rpf_magic(const uint8_t* bytes, uint32_t length);
#ifdef __cplusplus
}
#endif
