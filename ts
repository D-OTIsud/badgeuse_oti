[1mdiff --git a/src/components/AdminPage.tsx b/src/components/AdminPage.tsx[m
[1mindex 084d167..b8f7bee 100644[m
[1m--- a/src/components/AdminPage.tsx[m
[1m+++ b/src/components/AdminPage.tsx[m
[36m@@ -80,7 +80,8 @@[m [mconst ModificationValidationSection: React.FC<{[m
       });[m
     } catch (err: any) {[m
       console.error('Error validating request:', err);[m
[31m-      setError('Erreur lors de la validation de la demande.');[m
[32m+[m[32m      // Show the actual error message from the service[m
[32m+[m[32m      setError(err.message || 'Erreur lors de la validation de la demande.');[m
     } finally {[m
       setValidatingId(null);[m
     }[m
[1mdiff --git a/src/services/sessionModificationService.ts b/src/services/sessionModificationService.ts[m
[1mindex 300544c..e292273 100644[m
[1m--- a/src/services/sessionModificationService.ts[m
[1m+++ b/src/services/sessionModificationService.ts[m
[36m@@ -388,7 +388,26 @@[m [mexport const validateModificationRequest = async ([m
 [m
   if (error) {[m
     console.error('Error validating modification request:', error);[m
[31m-    throw error;[m
[32m+[m[41m    [m
[32m+[m[32m    // Provide user-friendly error messages[m
[32m+[m[32m    let userMessage = 'Une erreur est survenue lors de la validation de la demande.';[m
[32m+[m[41m    [m
[32m+[m[32m    if (error.message) {[m
[32m+[m[32m      // Check for specific database trigger errors[m
[32m+[m[32m      if (error.message.includes('cannot validate their own')) {[m
[32m+[m[32m        userMessage = 'Un utilisateur ne peut pas valider sa propre demande de modification.';[m
[32m+[m[32m      } else if (error.message.includes('not found')) {[m
[32m+[m[32m        userMessage = 'La demande de modification n\'existe plus.';[m
[32m+[m[32m      } else if (error.message.includes('UNIQUE constraint')) {[m
[32m+[m[32m        userMessage = 'Cette demande a déjà été validée.';[m
[32m+[m[32m      } else {[m
[32m+[m[32m        userMessage = error.message;[m
[32m+[m[32m      }[m
[32m+[m[32m    }[m
[32m+[m[41m    [m
[32m+[m[32m    const customError = new Error(userMessage);[m
[32m+[m[32m    (customError as any).code = error.code;[m
[32m+[m[32m    throw customError;[m
   }[m
 };[m
 [m
