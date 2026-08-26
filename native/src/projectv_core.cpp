#include "projectv_core.h"
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define PV_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define PV_EXPORT
#endif
extern "C" PV_EXPORT uint32_t projectv_api_version(void){return 1;}
extern "C" PV_EXPORT uint32_t projectv_rpf_magic(const uint8_t* bytes,uint32_t length){if(!bytes||length<4)return 0;return(uint32_t(bytes[0])<<24)|(uint32_t(bytes[1])<<16)|(uint32_t(bytes[2])<<8)|uint32_t(bytes[3]);}
